#include <stdio.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <string.h>
#include <arpa/inet.h>
#include <signal.h>
#include <stdlib.h>
#define BUFFER_SIZE 1024

volatile sig_atomic_t running_client = 1;

void handle_sigint(int sig)
{
    running_client = 0;
}

int main(int argc, char *argv[])
{
    int port;
    int socket_fd;
    struct sockaddr_in server_addr;
    char buffer[BUFFER_SIZE];

    signal(SIGINT, handle_sigint);

    if (argc < 2)
    {
        printf("Usage: %s <port番号>\n", argv[0]);
        return 1;
    }
    port = atoi(argv[1]);

    // ソケットの作成
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_fd < 0)
    {
        perror("Error creating socket");
        return EXIT_FAILURE;
    }

    // アドレス設定
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    if (inet_pton(AF_INET, "127.0.0.1", &server_addr.sin_addr) <= 0)
    {
        perror("Invalid IP address");
        close(socket_fd);
        return EXIT_FAILURE;
    }

    // サーバに接続
    if (connect(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
    {
        perror("Error connecting to server");
        close(socket_fd);
        return EXIT_FAILURE;
    }
    printf("Connected to server.\n");

    while (running_client)
    {
        // ユーザーからの入力を受け取る
        printf("Enter message: ");
        if (fgets(buffer, BUFFER_SIZE, stdin) == NULL)
        {
            break;
        }

        // サーバにデータを送信
        if (send(socket_fd, buffer, strlen(buffer), 0) < 0)
        {
            perror("Error sending data");
            break;
        }

        // サーバからのレスポンスを受け取る
        // memset(buffer, 0, BUFFER_SIZE);
        int bytes_read = recv(socket_fd, buffer, BUFFER_SIZE, 0);
        if (bytes_read < 0)
        {
            perror("Error receiving data");
            break;
        }
        printf("Received: %s", buffer);
    }

    // ソケットを閉じる
    close(socket_fd);
}
