#include <stdio.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <string.h>
#include <arpa/inet.h>
#include <signal.h>
#define PORT 8080
#define BUFFER_SIZE 1024

volatile sig_atomic_t stop = 0;

void handle_sigint(int sig)
{
    stop = 1;
}

int main()
{
    int socket_fd;
    struct sockaddr_in server_addr;
    char buffer[BUFFER_SIZE];

    signal(SIGINT, handle_sigint);


    // ソケットの作成
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);

    // アドレス設定
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(PORT);
    inet_pton(AF_INET, "127.0.0.1 ", &server_addr.sin_addr);

    // サーバに接続
    connect(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr));
    printf("Connected to server.\n");

    while (1)
    {
        // ユーザーからの入力を受け取る
        printf("Enter message: ");
        fgets(buffer, BUFFER_SIZE, stdin);

        if (stop)
        {
            printf("Exiting...\n");
            break;
        }

        // サーバにデータを送信
        send(socket_fd, buffer, strlen(buffer), 0);

        // サーバからのレスポンスを受け取る
        memset(buffer, 0, BUFFER_SIZE);
        int bytes_read = recv(socket_fd, buffer, BUFFER_SIZE, 0);


        printf("Received: %s", buffer);
    }

    // ソケットを閉じる
    close(socket_fd);

}
